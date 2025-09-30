import { LatencyCalculator } from "../components/latency_calculator"; // Make sure the path is correct

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-start items-center p-8 pb-20 sm:p-20 font-sans">
      <main className="flex flex-col gap-8 items-center sm:items-start mt-16">
        <LatencyCalculator />
      </main>
    </div>
  );
}
