"use server";

import { revalidatePath } from "next/cache";
import User from "../database/models/user.model";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";

// ✅ CREATE USER FUNCTION
export async function createUser(user: CreateUserParams) {
  try {
    console.log("🚀 createUser function triggered with data:", user);
    
    await connectToDatabase();
    console.log("✅ Connected to database");

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: user.clerkId });
    if (existingUser) {
      console.warn("⚠️ User already exists:", existingUser);
      return existingUser;
    }

    // Create user
    const newUser = await User.create(user);
    console.log("✅ User created successfully:", newUser);

    return JSON.parse(JSON.stringify(newUser));
  } catch (error: any) {
    console.error("❌ Error in createUser:", error);

    if (error.code === 11000) {
      return new Response("Error: User already exists", { status: 409 });
    }

    handleError(error);
  }
}

// ✅ READ USER FUNCTION
export async function getUserById(userId: string) {
  try {
    console.log("🔍 Fetching user by ID:", userId);
    
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId });

    if (!user) throw new Error("User not found");

    console.log("✅ User found:", user);
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error("❌ Error in getUserById:", error);
    handleError(error);
  }
}

// ✅ UPDATE USER FUNCTION
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    console.log(`🔄 Updating user ${clerkId} with data:`, user);

    await connectToDatabase();
    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    if (!updatedUser) throw new Error("User update failed");

    console.log("✅ User updated successfully:", updatedUser);
    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    console.error("❌ Error in updateUser:", error);
    handleError(error);
  }
}

// ✅ DELETE USER FUNCTION
export async function deleteUser(clerkId: string) {
  try {
    console.log(`🗑️ Deleting user ${clerkId}`);

    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath("/");

    console.log("✅ User deleted successfully:", deletedUser);
    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    console.error("❌ Error in deleteUser:", error);
    handleError(error);
  }
}

// ✅ UPDATE USER CREDITS FUNCTION
export async function updateCredits(userId: string, creditFee: number) {
  try {
    console.log(`💰 Updating credits for user ${userId} by ${creditFee}`);

    await connectToDatabase();

    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee } },
      { new: true }
    );

    if (!updatedUserCredits) throw new Error("User credits update failed");

    console.log("✅ User credits updated:", updatedUserCredits);
    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    console.error("❌ Error in updateCredits:", error);
    handleError(error);
  }
}
