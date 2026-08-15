import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const siteUrl = "https://rozgarmitra-india.com";
const defaultSeo = {
  title: "Rozgar Mitra India Official | रोजगार, Jobs और Rooms",
  description: "Rozgar Mitra India की official website—भारत में verified local jobs खोजें, candidates hire करें और किराये के rooms पाएं। Find work, find a room and build your future.",
};

const publicPages = {
  "/": defaultSeo,
  "/jobs": { title: "भारत में Local Jobs | नौकरियां – Rozgar Mitra India", description: "Rozgar Mitra India की official website पर freshers और experienced candidates के लिए verified local job opportunities खोजें।" },
  "/rooms": { title: "किराये के Rooms | Rooms for Rent – Rozgar Mitra India", description: "Workplace या college के पास verified किराये के rooms खोजें। Rent, location और facilities की पूरी जानकारी देखें।" },
  "/about": { title: "हमारे बारे में | About Rozgar Mitra India Official", description: "जानें कैसे Rozgar Mitra India job seekers, companies और room owners को एक trusted local platform पर जोड़ता है।" },
  "/contact": { title: "संपर्क करें | Contact Rozgar Mitra India", description: "Jobs, hiring और room listings में सहायता के लिए official Rozgar Mitra India team से संपर्क करें।" },
  "/register": { title: "रजिस्टर करें | Create Account – Rozgar Mitra India", description: "Rozgar Mitra India पर Candidate, Company या Room Owner के रूप में अपना account बनाएं।" },
  "/login": { title: "लॉगिन | Login – Rozgar Mitra India", description: "अपने Rozgar Mitra India account में सुरक्षित रूप से login करें।" },
};

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isJob = /^\/jobs\/[^/]+$/.test(pathname);
    const isRoom = /^\/rooms\/[^/]+$/.test(pathname);
    const seo = publicPages[pathname]
      || (isJob ? { title: "नौकरी की जानकारी | Job Details – Rozgar Mitra India", description: "Rozgar Mitra India पर job requirements, salary और application details देखें।" } : null)
      || (isRoom ? { title: "Room की जानकारी | Room Details – Rozgar Mitra India", description: "Rozgar Mitra India पर room rent, facilities और visit details देखें।" } : null)
      || defaultSeo;
    const indexable = Boolean(publicPages[pathname] || isJob || isRoom);
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonical = `${siteUrl}${canonicalPath}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', "content", seo.description);
    setMeta('meta[name="robots"]', "content", indexable ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" : "noindex, nofollow");
    setMeta('link[rel="canonical"]', "href", canonical);
    setMeta('meta[property="og:title"]', "content", seo.title);
    setMeta('meta[property="og:description"]', "content", seo.description);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[name="twitter:title"]', "content", seo.title);
    setMeta('meta[name="twitter:description"]', "content", seo.description);
  }, [pathname]);

  return null;
}
