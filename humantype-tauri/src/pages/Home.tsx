import { TypingForm } from "@/components/sections/TypingForm";

export function Home() {
  return (
    <div className="min-h-screen text-foreground">
      <header className="bg-background border-b border-border p-4">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-green-500 to-red-500 bg-clip-text text-transparent">
          HumanType
        </h1>
      </header>

      <main className="container mx-auto max-w-4xl p-6">
        <TypingForm />
      </main>
    </div>
  );
}

export default Home;

