// // ===== src/components/calculators/EndogeneityDiagnosis.jsx =====

// import React, { useState } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { 
//   AlertTriangle, 
//   CheckCircle, 
//   XCircle, 
//   HelpCircle,
//   ArrowRight
// } from 'lucide-react';

// const EndogeneityDiagnosis = ({ 
//   dataPoints = [],
//   regressionResults = null,
//   onEndogeneityStatusChange = null
// }) => {
  
//   // ===== State for endogeneity checks =====
//   const [checks, setChecks] = useState({
//     omittedVariables: false,
//     measurementError: false,
//     simultaneity: false,
//     autocorrelation: false
//   });
  
//   const [explanations, setExplanations] = useState({
//     omittedVariables: '',
//     measurementError: '',
//     simultaneity: '',
//     autocorrelation: ''
//   });

//   // ===== Check if endogeneity is present =====
//   const hasEndogeneity = Object.values(checks).some(v => v === true);
//   const endogeneityCount = Object.values(checks).filter(v => v === true).length;

//   // ===== Handle checkbox changes =====
//   const handleCheckChange = (type, value) => {
//     setChecks(prev => ({
//       ...prev,
//       [type]: value
//     }));
    
//     if (onEndogeneityStatusChange) {
//       onEndogeneityStatusChange({
//         ...checks,
//         [type]: value
//       });
//     }
//   };

//   // ===== Handle explanation changes =====
//   const handleExplanationChange = (type, value) => {
//     setExplanations(prev => ({
//       ...prev,
//       [type]: value
//     }));
//   };

//   // ===== Render each endogeneity type =====
//   const renderEndogeneityType = (type, label, description, icon) => {
//     const isChecked = checks[type];
    
//     return (
//       <div className="border rounded-lg p-3 space-y-2">
//         <div className="flex items-start gap-3">
//           <div className="flex items-center gap-2 flex-1">
//             <input
//               type="checkbox"
//               checked={isChecked}
//               onChange={(e) => handleCheckChange(type, e.target.checked)}
//               className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//             />
//             <div>
//               <div className="flex items-center gap-2">
//                 <span className="font-medium text-sm">{label}</span>
//                 {icon}
//               </div>
//               <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
//             </div>
//           </div>
//           {isChecked && (
//             <Badge variant="destructive" className="flex-shrink-0">⚠️ Checked</Badge>
//           )}
//         </div>
        
//         {isChecked && (
//           <div className="ml-6">
//             <textarea
//               placeholder="Describe why this might be causing endogeneity (e.g., 'Ability is omitted from the wage equation')"
//               value={explanations[type]}
//               onChange={(e) => handleExplanationChange(type, e.target.value)}
//               className="w-full text-xs p-2 border rounded-md bg-gray-50 dark:bg-gray-900/50 resize-y min-h-[60px]"
//             />
//             <div className="mt-1 text-[10px] text-gray-400">
//               💡 Tip: Be specific about the suspected cause
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   // ===== Endogeneity sources from your notes =====
//   const endogeneityTypes = [
//     {
//       type: 'omittedVariables',
//       label: 'Omitted Variables',
//       description: 'Are there important variables not included in the model? (e.g., ability, motivation)',
//       icon: <HelpCircle className="h-4 w-4 text-yellow-500" />
//     },
//     {
//       type: 'measurementError',
//       label: 'Measurement Error',
//       description: 'Are variables measured with error? (e.g., reported income vs actual income)',
//       icon: <HelpCircle className="h-4 w-4 text-orange-500" />
//     },
//     {
//       type: 'simultaneity',
//       label: 'Simultaneity / Reverse Causality',
//       description: 'Does the dependent variable also affect the independent variable? (e.g., supply and demand)',
//       icon: <HelpCircle className="h-4 w-4 text-red-500" />
//     },
//     {
//       type: 'autocorrelation',
//       label: 'Autocorrelation (Time Series)',
//       description: 'Are errors correlated across time periods? (e.g., GDP this year affects next year)',
//       icon: <HelpCircle className="h-4 w-4 text-purple-500" />
//     }
//   ];

//   // ===== Render recommendations =====
//   const getRecommendation = () => {
//     if (!hasEndogeneity) {
//       return {
//         status: 'good',
//         message: 'No endogeneity detected. OLS estimation should be unbiased and consistent.',
//         action: 'Proceed with OLS estimation',
//         icon: <CheckCircle className="h-5 w-5 text-green-500" />
//       };
//     }
    
//     const types = Object.keys(checks).filter(k => checks[k]);
//     const typeNames = types.map(t => {
//       const found = endogeneityTypes.find(e => e.type === t);
//       return found ? found.label : t;
//     });
    
//     return {
//       status: 'warning',
//       message: `Endogeneity detected from: ${typeNames.join(', ')}`,
//       action: 'Consider using Instrumental Variables (IV) or Two-Stage Least Squares (2SLS)',
//       icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
//     };
//   };

//   const recommendation = getRecommendation();

//   return (
//     <Card className="w-full">
//       <CardHeader className="pb-3">
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900">
//               <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
//             </div>
//             <CardTitle className="text-base">Endogeneity Diagnosis (MLR.4 Check)</CardTitle>
//           </div>
//           <Badge className={`text-xs ${
//             recommendation.status === 'good' ? 'bg-green-100 text-green-800' :
//             'bg-yellow-100 text-yellow-800'
//           }`}>
//             {hasEndogeneity ? '⚠️ Endogeneity Detected' : '✅ No Endogeneity'}
//           </Badge>
//         </div>
//         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
//           Check any sources of endogeneity that may be present in your model
//         </p>
//       </CardHeader>
      
//       <CardContent className="space-y-4">
//         {/* Endogeneity Sources */}
//         <div className="space-y-2">
//           {endogeneityTypes.map((item) => (
//             renderEndogeneityType(
//               item.type,
//               item.label,
//               item.description,
//               item.icon
//             )
//           ))}
//         </div>
        
//         {/* Summary Alert */}
//         <Alert variant="default" className={`border-l-4 ${
//           recommendation.status === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
//           'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
//         }`}>
//           <div className="flex items-start gap-3">
//             {recommendation.icon}
//             <div>
//               <AlertDescription className="text-sm">
//                 <strong>{recommendation.message}</strong>
//                 <br />
//                 <span className="text-xs text-gray-600 dark:text-gray-400">
//                   💡 Recommendation: {recommendation.action}
//                 </span>
//                 {endogeneityCount > 0 && (
//                   <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
//                     {endogeneityCount} source{endogeneityCount > 1 ? 's' : ''} checked. 
//                     Consider reviewing the explanations provided.
//                   </div>
//                 )}
//               </AlertDescription>
//             </div>
//           </div>
//         </Alert>
        
//         {/* Helpful Notes */}
//         <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
//           <p className="font-medium">📚 From Your Econometrics Notes:</p>
//           <ul className="list-disc list-inside space-y-0.5 mt-1">
//             <li>Endogeneity violates MLR.4: E(u|x) = 0</li>
//             <li>Consequences: OLS estimators become biased and inconsistent</li>
//             <li>Solution: Use Instrumental Variables (IV) or 2SLS estimation</li>
//             <li>Remember: IV requires instruments that are exogenous and relevant</li>
//           </ul>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default EndogeneityDiagnosis;
// ===== src/components/calculators/EndogeneityDiagnosis.jsx =====

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  ArrowRight,
  XCircle
} from 'lucide-react';

const EndogeneityDiagnosis = ({ 
  dataPoints = [],
  regressionResults = null,
  onEndogeneityStatusChange = null
}) => {
  
  // ===== State for endogeneity checks =====
  const [checks, setChecks] = useState({
    omittedVariables: false,
    measurementError: false,
    simultaneity: false,
    autocorrelation: false
  });
  
  const [explanations, setExplanations] = useState({
    omittedVariables: '',
    measurementError: '',
    simultaneity: '',
    autocorrelation: ''
  });

  // ===== Check if endogeneity is present =====
  const hasEndogeneity = Object.values(checks).some(v => v === true);
  const endogeneityCount = Object.values(checks).filter(v => v === true).length;

  // ===== Handle checkbox changes =====
  const handleCheckChange = (type, value) => {
    const newChecks = {
      ...checks,
      [type]: value
    };
    setChecks(newChecks);
    
    if (onEndogeneityStatusChange) {
      onEndogeneityStatusChange(newChecks);
    }
  };

  // ===== Handle explanation changes =====
  const handleExplanationChange = (type, value) => {
    setExplanations(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // ===== Endogeneity sources from your notes =====
  const endogeneityTypes = [
    {
      type: 'omittedVariables',
      label: 'Omitted Variables',
      description: 'Are there important variables not included in the model? (e.g., ability, motivation, location)',
      icon: <HelpCircle className="h-4 w-4 text-yellow-500" />,
      example: 'Example: Ability is omitted from the wage equation'
    },
    {
      type: 'measurementError',
      label: 'Measurement Error',
      description: 'Are variables measured with error? (e.g., reported income vs actual income)',
      icon: <HelpCircle className="h-4 w-4 text-orange-500" />,
      example: 'Example: Survey respondents underreport income'
    },
    {
      type: 'simultaneity',
      label: 'Simultaneity / Reverse Causality',
      description: 'Does the dependent variable also affect the independent variable?',
      icon: <HelpCircle className="h-4 w-4 text-red-500" />,
      example: 'Example: Supply and demand are jointly determined'
    },
    {
      type: 'autocorrelation',
      label: 'Autocorrelation (Time Series)',
      description: 'Are errors correlated across time periods? (e.g., GDP this year affects next year)',
      icon: <HelpCircle className="h-4 w-4 text-purple-500" />,
      example: 'Example: Economic shocks persist over time'
    }
  ];

  // ===== Render recommendations =====
  const getRecommendation = () => {
    if (!hasEndogeneity) {
      return {
        status: 'good',
        message: 'No endogeneity sources identified. OLS estimation should be unbiased and consistent.',
        action: 'Proceed with OLS estimation',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      };
    }
    
    const types = Object.keys(checks).filter(k => checks[k]);
    const typeNames = types.map(t => {
      const found = endogeneityTypes.find(e => e.type === t);
      return found ? found.label : t;
    });
    
    return {
      status: 'warning',
      message: `Endogeneity detected from: ${typeNames.join(', ')}`,
      action: 'Consider using Instrumental Variables (IV) or Two-Stage Least Squares (2SLS)',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
    };
  };

  const recommendation = getRecommendation();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900">
              <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-base">Endogeneity Diagnosis (MLR.4 Check)</CardTitle>
          </div>
          <Badge className={`text-xs ${
            recommendation.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}>
            {hasEndogeneity ? '⚠️ Endogeneity Detected' : '✅ No Endogeneity'}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Check any sources of endogeneity that may be present in your model
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Endogeneity Sources */}
        <div className="space-y-2">
          {endogeneityTypes.map((item) => {
            const isChecked = checks[item.type];
            
            return (
              <div key={item.type} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleCheckChange(item.type, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.icon}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">{item.example}</p>
                    </div>
                  </div>
                  {isChecked && (
                    <Badge variant="destructive" className="flex-shrink-0 text-[10px]">⚠️ Checked</Badge>
                  )}
                </div>
                
                {isChecked && (
                  <div className="ml-6">
                    <textarea
                      placeholder="Describe why this might be causing endogeneity..."
                      value={explanations[item.type]}
                      onChange={(e) => handleExplanationChange(item.type, e.target.value)}
                      className="w-full text-xs p-2 border rounded-md bg-gray-50 dark:bg-gray-900/50 resize-y min-h-[50px]"
                    />
                    <div className="mt-1 text-[10px] text-gray-400">
                      💡 Tip: Be specific about the suspected cause
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Summary Alert */}
        <Alert variant="default" className={`border-l-4 ${
          recommendation.status === 'good' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
          'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
        }`}>
          <div className="flex items-start gap-3">
            {recommendation.icon}
            <div>
              <AlertDescription className="text-sm">
                <strong>{recommendation.message}</strong>
                <br />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  💡 Recommendation: {recommendation.action}
                </span>
                {endogeneityCount > 0 && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {endogeneityCount} source{endogeneityCount > 1 ? 's' : ''} checked. 
                    {Object.values(explanations).some(e => e.trim() !== '') && (
                      <span> Explanations provided for: {
                        Object.keys(explanations).filter(k => explanations[k].trim() !== '').join(', ')
                      }</span>
                    )}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        {/* Helpful Notes */}
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
          <p className="font-medium">📚 From Your Econometrics Notes:</p>
          <ul className="list-disc list-inside space-y-0.5 mt-1">
            <li>Endogeneity violates <strong>MLR.4: E(u|x) = 0</strong></li>
            <li>Consequences: OLS estimators become <strong>biased and inconsistent</strong></li>
            <li>Solution: Use <strong>Instrumental Variables (IV)</strong> or <strong>2SLS</strong> estimation</li>
            <li>IV requires instruments that are: <strong>exogenous</strong> (uncorrelated with u) and <strong>relevant</strong> (correlated with x)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EndogeneityDiagnosis;