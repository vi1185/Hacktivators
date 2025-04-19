import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Target, Book, ArrowRight, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import type { PracticeReport } from '@/types/practice';

interface PracticeReportProps {
  report: PracticeReport;
}

const PracticeReport: React.FC<PracticeReportProps> = ({ report }) => {
  // Add default values to prevent undefined errors
  const {
    duration = 0,
    totalInteractions = 0,
    successRate = 0,
    averageConfidence = 0,
    helpRequests = 0,
    conceptMastery = [],
    strengths = [],
    weaknesses = [],
    nextSteps = [],
    adaptiveRecommendations = {
      expand: [],
      simplify: [],
      practice: []
    }
  } = report || {};

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (!report) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No practice report available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Practice Session Report</CardTitle>
          <CardDescription>
            Analysis of your practice session performance and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Target className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">Success Rate</h3>
                    <Progress value={successRate * 100} className="mt-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Time:</span>
                    <p className="font-medium">{formatDuration(duration)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Interactions:</span>
                    <p className="font-medium">{totalInteractions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">Confidence Level</h3>
                    <Progress value={averageConfidence * 100} className="mt-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Help Requests:</span>
                    <p className="font-medium">{helpRequests}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Topics Covered:</span>
                    <p className="font-medium">{conceptMastery.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Concept Mastery */}
          {conceptMastery.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Book className="h-5 w-5" />
                Concept Mastery
              </h3>
              <div className="grid gap-2">
                {conceptMastery.map((concept) => (
                  <div key={concept.concept} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{concept.concept}</span>
                        <span className="text-sm text-muted-foreground">{(concept.mastery * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={concept.mastery * 100} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Recommendations */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </h3>

            {/* Strengths and Weaknesses */}
            {strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Areas of Strength</h4>
                <div className="flex flex-wrap gap-2">
                  {strengths.map((strength, index) => (
                    <Badge key={index} variant="secondary" className="bg-green-500/10">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Areas to Improve</h4>
                <div className="flex flex-wrap gap-2">
                  {weaknesses.map((weakness, index) => (
                    <Badge key={index} variant="secondary" className="bg-yellow-500/10">
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Course Adjustments */}
            {(adaptiveRecommendations.expand.length > 0 || adaptiveRecommendations.simplify.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Course Adjustments</h4>
                <div className="grid gap-2">
                  {adaptiveRecommendations.expand.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Expand coverage of {topic}</span>
                    </div>
                  ))}
                  {adaptiveRecommendations.simplify.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TrendingDown className="h-4 w-4 text-yellow-500" />
                      <span>Simplify coverage of {topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {nextSteps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Next Steps</h4>
                <div className="grid gap-2">
                  {nextSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Recommendations */}
            {adaptiveRecommendations.practice.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Practice Recommendations</h4>
                <div className="grid gap-2">
                  {adaptiveRecommendations.practice.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Brain className="h-4 w-4 text-blue-500" />
                      <span>Practice more on {topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeReport; 