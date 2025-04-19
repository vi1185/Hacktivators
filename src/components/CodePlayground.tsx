import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Play, RefreshCw, Lightbulb, CheckCircle, XCircle, Clock, Brain } from 'lucide-react';
import type { CodePlaygroundExercise, CodeExecutionResult } from '@/types/practice';
import LoadingIndicator from './LoadingIndicator';

interface CodePlaygroundProps {
  exercise: CodePlaygroundExercise;
  onComplete?: (result: CodeExecutionResult) => void;
}

const CodePlayground: React.FC<CodePlaygroundProps> = ({ exercise, onComplete }) => {
  const [code, setCode] = useState(exercise.initialCode);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('problem');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [usedHints, setUsedHints] = useState<number[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      // Here we would integrate with a code execution service
      // For now, we'll simulate execution
      const result: CodeExecutionResult = {
        success: true,
        output: 'Program output will appear here...',
        executionTime: 0.5,
        memoryUsed: 24,
        testResults: exercise.testCases.map((testCase, index) => ({
          testCase: index + 1,
          passed: Math.random() > 0.3,
          output: 'Test output...',
          expectedOutput: testCase.expectedOutput,
          executionTime: 0.1
        }))
      };

      setExecutionResult(result);
      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      toast.error('Failed to execute code');
      console.error('Code execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(exercise.initialCode);
    setExecutionResult(null);
  };

  const handleRequestHint = (index: number) => {
    if (!usedHints.includes(index)) {
      setUsedHints([...usedHints, index]);
    }
  };

  const handleAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    try {
      // Here we would call the AI service for code analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('AI Analysis complete');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{exercise.title}</CardTitle>
            <Badge variant={exercise.difficulty === 'beginner' ? 'secondary' : 
                          exercise.difficulty === 'intermediate' ? 'default' : 'destructive'}>
              {exercise.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="problem" className="flex-1">Problem</TabsTrigger>
              <TabsTrigger value="hints" className="flex-1">Hints</TabsTrigger>
              <TabsTrigger value="tests" className="flex-1">Tests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="problem">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="prose dark:prose-invert">
                  <p>{exercise.description}</p>
                  <h4>Input Format</h4>
                  <p>Example input: {exercise.testCases[0]?.input}</p>
                  <h4>Output Format</h4>
                  <p>Example output: {exercise.testCases[0]?.expectedOutput}</p>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="hints">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {exercise.hints.map((hint, index) => (
                    <div key={index} className="space-y-2">
                      {usedHints.includes(index) ? (
                        <Alert>
                          <AlertDescription>{hint}</AlertDescription>
                        </Alert>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleRequestHint(index)}
                        >
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Reveal Hint {index + 1}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="tests">
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {exercise.testCases.map((testCase, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Test Case {index + 1}</h4>
                        {executionResult?.testResults?.[index] && (
                          executionResult.testResults[index].passed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{testCase.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Code Editor</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                disabled={isRunning}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleAiAnalysis}
                disabled={isRunning || isAiAnalyzing}
              >
                <Brain className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleRunCode}
                disabled={isRunning}
              >
                {isRunning ? (
                  <LoadingIndicator size="sm" inline label="Running..." />
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] border rounded-md overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage={exercise.language.toLowerCase()}
              defaultValue={exercise.initialCode}
              theme="vs-dark"
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {executionResult && (
            <>
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Execution Results</span>
                  <span className="text-muted-foreground">
                    {executionResult.executionTime}s | {executionResult.memoryUsed}MB
                  </span>
                </div>
                <ScrollArea className="h-[100px] w-full rounded-md border bg-muted p-4">
                  <pre className="font-mono text-sm">
                    {executionResult.output}
                    {executionResult.error && (
                      <span className="text-red-500">{executionResult.error}</span>
                    )}
                  </pre>
                </ScrollArea>
              </div>
              
              {executionResult.testResults && (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Test Results</span>
                    <span className="text-muted-foreground">
                      {executionResult.testResults.filter(t => t.passed).length} / {executionResult.testResults.length} passed
                    </span>
                  </div>
                  <Progress 
                    value={
                      (executionResult.testResults.filter(t => t.passed).length / 
                      executionResult.testResults.length) * 100
                    } 
                  />
                </div>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default CodePlayground; 