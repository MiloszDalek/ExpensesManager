import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface QuickStatsProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend: string;
}

export default function QuickStats({ title, value, icon: Icon, gradient, trend }: QuickStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-8 -mt-8`} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {value}
              </h3>
              <p className="text-xs text-gray-400">{trend}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}