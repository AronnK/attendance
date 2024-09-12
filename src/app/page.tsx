"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative grid grid-rows-[auto_1fr_auto] min-h-screen">
      <video
        className="absolute inset-0 w-full h-full object-cover -z-10"
        autoPlay
        muted
        loop
        src="https://www.panimalarengineeringcollegechennai.ac.in/assets/video/city-campus.mp4"
      />
      <Header />

      <main className="row-start-2 flex flex-col gap-8 items-center justify-center"></main>

      <Footer />
    </div>
  );
}
