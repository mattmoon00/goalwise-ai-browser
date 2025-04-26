// src/pages/Success.tsx
import { Link } from "react-router-dom";

export default function Success() {
  return (
    <div className="max-w-xl mx-auto mt-16 p-8 text-center bg-white shadow rounded">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Success!</h1>
      <p className="text-gray-700 mb-6">
        🎉 Your subscription has been activated. Welcome to the upgraded plan!
      </p>
      <Link
        to="/"
        className="inline-block bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
 