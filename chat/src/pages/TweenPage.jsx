import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TweenGraph from "../components/TweenGraph";

export default function TweenPage() {
  return (
    <div className="relative h-screen bg-zinc-950">
      <Link
        to="/"
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm hover:bg-zinc-700 text-white"
      >
        ← Back
      </Link>
      <TweenGraph />
    </div>
  );
}
