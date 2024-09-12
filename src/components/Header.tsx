import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@radix-ui/react-menubar";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const handleRoute = (className: string) => {
    console.log(`Routing to /datatable?class=${className}`);
    router.push(`/datatable?class=${className}`);
  };

  return (
    <header className="row-start-1 w-full p-5 flex items-center bg-black bg-opacity-50">
      <Image
        src="https://www.panimalarengineeringcollegechennai.ac.in/assets/images/pec-logo.png"
        alt="Logo"
        width={200}
        height={200}
        onClick={() => router.push("/")}
      />
      <div className="flex-grow flex items-center justify-center">
        {pathname === "/" && (
          <Menubar className="border border-black rounded-lg p-2 flex gap-64">
            <MenubarMenu>
              <MenubarTrigger>AIDS</MenubarTrigger>
              <MenubarContent className="bg-white text-black mt-6 p-4 rounded-lg shadow-lg w-60">
                <MenubarItem onClick={() => handleRoute("AIDS-A")}>
                  AIDS - A
                </MenubarItem>
                <MenubarItem onClick={() => handleRoute("AIDS-B")}>
                  AIDS - B
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>CSE</MenubarTrigger>
              <MenubarContent className="bg-white text-black mt-6 p-4 rounded-lg shadow-lg w-60">
                <MenubarItem>CSE - A</MenubarItem>
                <MenubarItem>CSE - B</MenubarItem>
                <MenubarItem>CSE - C</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>IT</MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        )}
      </div>
      <h1 className="text-white text-3xl pr-10 font-bold">Attendance Marker</h1>
    </header>
  );
}
