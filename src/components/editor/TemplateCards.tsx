import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Sparkles, BookMarked, GraduationCap } from "lucide-react";

interface TemplateCardsProps {
  onChoose: (templateKey: string) => void;
}

export function TemplateCards({ onChoose }: TemplateCardsProps) {
  const items = [
    { 
      k: "basic", 
      title: "Basic Lesson", 
      desc: "LOs, Content, Activity, Reflection", 
      icon: BookMarked 
    },
    { 
      k: "interactive", 
      title: "Interactive Lesson", 
      desc: "Steps, prompts, checks", 
      icon: Sparkles 
    },
    { 
      k: "assessment", 
      title: "Assessment", 
      desc: "Quiz A–D with answers", 
      icon: GraduationCap 
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-6">
      {items.map(({ k, title, desc, icon: Icon }) => (
        <Card 
          key={k} 
          className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 hover:border-blue-200" 
          onClick={() => onChoose(k)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-blue-600" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {desc}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
