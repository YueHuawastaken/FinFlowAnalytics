import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Lock } from 'lucide-react';

export default function CalculatorPlaceholder({ title, description, icon: Icon, comingSoon = true }) {
  return (
    <Card className="w-full opacity-60 cursor-not-allowed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Icon className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-600 dark:text-gray-400">{title}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
          {comingSoon && (
            <Badge variant="secondary" className="gap-2">
              <Lock className="h-3 w-3" />
              Coming Soon
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center py-12 space-y-3">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="text-gray-500 font-medium">Calculator Under Development</p>
          <p className="text-sm text-gray-400">This advanced calculator will be available soon</p>
        </div>
      </CardContent>
    </Card>
  );
}