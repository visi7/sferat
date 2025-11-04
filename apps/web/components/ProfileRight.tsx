"use client";

export default function ProfileRight() {
  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Credentials & Highlights</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span>💼</span> <span><a className="underline" href="#">Add employment credential</a></span>
          </li>
          <li className="flex items-center gap-2">
            <span>🎓</span> <span><a className="underline" href="#">Add education credential</a></span>
          </li>
          <li className="flex items-center gap-2">
            <span>📍</span> <span><a className="underline" href="#">Add location credential</a></span>
          </li>
        </ul>
        <div className="text-xs text-gray-500 mt-2">Joined {new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
      </section>

      <section className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Knows about</h3>
        <p className="text-sm text-gray-600">You haven't added any topics yet.</p>
        <button className="mt-2 px-3 py-1.5 rounded border text-sm">Add topics</button>
      </section>
    </div>
  );
}
