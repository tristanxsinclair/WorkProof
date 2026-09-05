import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'WorkProof — Your experience, put to work',description:'Capture real experiences. Verify the evidence. Find the words for your next opportunity.',icons:{icon:'/favicon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#155e49'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
