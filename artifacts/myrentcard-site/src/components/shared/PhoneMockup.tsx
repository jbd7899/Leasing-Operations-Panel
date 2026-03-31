import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
}

export function PhoneMockup({ children, className, tilt = false }: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "phone-frame w-[280px] sm:w-[300px]",
        tilt && "md:[transform:perspective(1200px)_rotateY(-5deg)_rotateX(2deg)]",
        className
      )}
    >
      <div className="phone-screen aspect-[9/19.5] relative">
        <div className="phone-notch" />
        <div className="h-full w-full pt-10 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
