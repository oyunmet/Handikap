import { useEffect, useRef, useState } from "react";
import type { WarRoomWeaponId } from "./war-room-data";
import {
  getWarRoomRenderedWeaponIconDataUrl,
  getWarRoomWeaponIconDataUrl,
} from "./war-room-weapon-icons";

export function WarRoomWeaponIcon({
  weaponId,
  className,
}: {
  weaponId: WarRoomWeaponId;
  className: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [source, setSource] = useState(() => getWarRoomWeaponIconDataUrl(weaponId));

  useEffect(() => {
    let active = true;
    const render = () => {
      void getWarRoomRenderedWeaponIconDataUrl(weaponId).then((dataUrl) => {
        if (active) setSource(dataUrl);
      });
    };
    const image = imageRef.current;
    if (image && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          render();
        }
      }, { rootMargin: "120px" });
      observer.observe(image);
      return () => {
        active = false;
        observer.disconnect();
      };
    }
    render();
    return () => { active = false; };
  }, [weaponId]);

  return <img ref={imageRef} className={className} src={source} alt="" aria-hidden="true" />;
}
