import "server-only";
import { auth } from "@clerk/nextjs/server";

export async function getUserId() {
  return (await auth()).userId;
}
