import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Namadi Vagas",
    short_name: "Namadi",
    description: "Buscas de vagas salvas, um robô que vigia por você e os contatos certos quando você favorita.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#17140f",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
