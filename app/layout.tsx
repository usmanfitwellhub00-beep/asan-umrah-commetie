import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";
import { LangProvider } from "@/components/LangContext";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const urdu = Noto_Naskh_Arabic({ variable: "--font-urdu", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asaan Umra Committee",
  description: "Asaan Umra Committee management portal",
};

const themeScript = `try{var l=localStorage.getItem('um-lang');if(l==='ur'){document.documentElement.setAttribute('lang','ur');if(location.pathname.indexOf('/login')!==0)document.documentElement.setAttribute('dir','rtl')}}catch(e){}try{var t=localStorage.getItem('um-theme');if(t!=='dark'&&t!=='light'){t='light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${urdu.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full"><LangProvider>{children}</LangProvider></body>
    </html>
  );
}
