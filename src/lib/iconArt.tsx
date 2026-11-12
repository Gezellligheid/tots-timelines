import { ImageResponse } from "next/og";

/** The app icon: a friendly baby face on a pastel field. Artwork lives in a 512 grid; the face stays inside the maskable safe zone. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#cfd3f8"/>
  <circle cx="118" cy="408" r="190" fill="#f4d6d2"/>
  <circle cx="432" cy="104" r="138" fill="#cde8e0"/>
  <circle cx="256" cy="268" r="140" fill="#17171a" opacity="0.10"/>
  <circle cx="256" cy="256" r="140" fill="#fbe9a6"/>
  <path d="M236 128c6-32 40-44 62-24" fill="none" stroke="#17171a" stroke-width="13" stroke-linecap="round"/>
  <circle cx="210" cy="246" r="13" fill="#17171a"/>
  <circle cx="302" cy="246" r="13" fill="#17171a"/>
  <circle cx="184" cy="292" r="19" fill="#f08f86" opacity="0.55"/>
  <circle cx="328" cy="292" r="19" fill="#f08f86" opacity="0.55"/>
  <path d="M222 294c14 26 54 26 68 0" fill="none" stroke="#17171a" stroke-width="13" stroke-linecap="round"/>
</svg>`;

const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`;

export function renderIcon(size: number) {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={dataUri} width={size} height={size} alt="" style={{ width: size, height: size }} />
    ),
    { width: size, height: size },
  );
}
