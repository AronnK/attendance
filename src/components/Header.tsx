import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@radix-ui/react-menubar";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { generateSummaryPDF } from "./exportSummary";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const handleRoute = (mentorName: string) => {
    console.log(`Routing to /datatable?mentor=${mentorName}`);
    router.push(`/datatable?mentor=${mentorName}`);
  };
  const handleExportClick = async () => {
    try {
      await generateSummaryPDF();
      console.log("PDF generated successfully.");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
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
                <MenubarItem onClick={() => handleRoute("mentor1")}>
                  Mentor 1
                </MenubarItem>
                <MenubarItem onClick={() => handleRoute("mentor2")}>
                  Mentor 2
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>CSE</MenubarTrigger>
              <MenubarContent className="bg-white text-black mt-6 p-4 rounded-lg shadow-lg w-60">
                <MenubarItem onClick={() => handleRoute("mentor3")}>
                  Mentor 3
                </MenubarItem>
                <MenubarItem onClick={() => handleRoute("mentor4")}>
                  Mentor 4
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger onClick={() => handleRoute("mentor5")}>
                IT
              </MenubarTrigger>
            </MenubarMenu>
          </Menubar>
        )}
      </div>
      <button
        onClick={handleExportClick}
        className="text-white text-3xl pr-10 font-bold border border-black flex items-center justify-center"
      >
        Export Summary
      </button>
    </header>
  );
}
