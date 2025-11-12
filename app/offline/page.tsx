export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-center">
      <h1 className="text-2xl font-bold mb-2">You’re offline</h1>
      <p className="text-gray-300">
        No internet connection detected. You can still browse cached pages. 
        Please reconnect to see the latest inventory.
      </p>
    </main>
  );
}
