import { ApplicationDashboard } from "@/components/application-dashboard";
import { Providers } from "@/app/providers";

export default function Home() {
  return (
    <Providers>
      <ApplicationDashboard />
    </Providers>
  );
}
