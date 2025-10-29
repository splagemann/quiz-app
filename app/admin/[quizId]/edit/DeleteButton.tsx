"use client";

export default function DeleteButton() {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm("Bist du sicher, dass du dieses Quiz löschen möchtest? Dies kann nicht rückgängig gemacht werden.")) {
      e.preventDefault();
    }
  };

  return (
    <button
      type="submit"
      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
      onClick={handleClick}
    >
      Quiz löschen
    </button>
  );
}
