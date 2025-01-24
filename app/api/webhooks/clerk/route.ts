/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // Retrieve webhook secret
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("WEBHOOK_SECRET is missing in .env");
    throw new Error("Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Debug: Log headers
  console.log("Received Webhook Headers:", {
    svix_id,
    svix_timestamp,
    svix_signature,
  });

  // If any header is missing, return error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing required Svix headers");
    return new Response("Error: Missing Svix headers", { status: 400 });
  }

  // Get and verify the webhook body
  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Webhook verification failed", { status: 400 });
  }

  // Extract event data
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Processing webhook event: ${eventType} (ID: ${id})`);

  // **Handle User Created Event**
  if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

    const user = {
      clerkId: id,
      email: email_addresses[0]?.email_address || "",
      username: username || email_addresses[0]?.email_address.split("@")[0], // Use email prefix if username is null
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      photo: image_url,
    };

    try {
      const newUser = await createUser(user);
      console.log("User created successfully:", newUser);

      // **Use `updateUser` instead of `updateUserMetadata`**
      const client = await clerkClient(); // Await the promise to get the ClerkClient
      await client.users.updateUser(id, {
        publicMetadata: { userId: newUser._id },
      });

      return NextResponse.json({ message: "User created successfully", user: newUser });
    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error: Failed to create user", { status: 500 });
    }
  }

  // **Handle User Updated Event**
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;

    const user = {
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      username: username || "", // Default to empty string if missing
      photo: image_url,
    };

    try {
      const updatedUser = await updateUser(id, user);
      console.log("User updated successfully:", updatedUser);
      return NextResponse.json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      return new Response("Error: Failed to update user", { status: 500 });
    }
  }

  // **Handle User Deleted Event**
  if (eventType === "user.deleted") {
    try {
      if (!id) {
        throw new Error("User ID is undefined");
      }
      const deletedUser = await deleteUser(id);
      console.log("User deleted successfully:", deletedUser);
      return NextResponse.json({ message: "User deleted successfully", user: deletedUser });
    } catch (error) {
      console.error("Error deleting user:", error);
      return new Response("Error: Failed to delete user", { status: 500 });
    }
  }

  console.log(`Unhandled webhook event type: ${eventType}`);
  return new Response("", { status: 200 });
}
