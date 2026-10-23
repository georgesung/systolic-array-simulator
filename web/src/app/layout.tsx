import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://systolic-array-simulator.georgesung.com";
const TITLE =
  "Systolic Array Simulator | Interactive Hardware Matrix Multiplication & TPU Visualizer";
const DESCRIPTION =
  "Interactive clock-cycle-accurate systolic array simulator built with Rust and WebAssembly. Visualize Processing Elements (PE), 1D pipelined dot products, 2D weight-stationary matrix multiplication (GEMM), and tiled TPU execution.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "systolic array",
    "systolic array simulator",
    "matrix multiplication hardware",
    "weight stationary",
    "processing element",
    "MAC unit",
    "TPU architecture",
    "GEMM visualizer",
    "tiled matrix multiplication",
    "AI hardware accelerator",
  ],
  authors: [{ name: "George Sung", url: "https://www.georgesung.com/about/" }],
  creator: "George Sung",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/`,
    siteName: "Systolic Array Simulator",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: "/favicon.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "LearningResource"],
  name: "Systolic Array Simulator",
  headline: TITLE,
  url: `${SITE_URL}/`,
  description: DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (Web Browser)",
  learningResourceType: "Interactive Simulation",
  author: {
    "@type": "Person",
    name: "George Sung",
    alternateName: "Jou-ching Sung",
    url: "https://www.georgesung.com/about/",
  },
  isPartOf: {
    "@type": "Article",
    name: "Systolic array matrix multiplication for LLMs, with interactive hardware simulator",
    url: "https://www.georgesung.com/ai-hardware/systolic-array-matmul/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JBMPXGG0W6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-JBMPXGG0W6');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
