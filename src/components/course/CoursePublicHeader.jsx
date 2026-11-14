import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function CoursePublicHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/" aria-label="جداره، الصفحة الرئيسية"><Logo tone="dark" size={44} /></Link>
      <Button asChild variant="outline"><Link to="/"><ArrowRight size={16} /> العودة إلى الصفحة الرئيسية</Link></Button>
    </header>
  );
}