import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import TestCurrentUser from "./test-user/page";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      {/* <TestCurrentUser/> */}
      <Show when="signed-out">
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="rounded-md border px-4 py-2">
              Sign in
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button className="rounded-md bg-black px-4 py-2 text-white">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="flex items-center gap-4">
          <p>You are signed in.</p>
          <UserButton />
        </div>
      </Show>
    </main>
  );
}