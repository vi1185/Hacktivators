import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import autogenService, { LearningObjective, StudyPlan, PracticeProblem, ContentSummary } from '@/services/autogen-service';
import type { Flashcard } from '@/types/course';

interface AILearningToolsProps {
  topic?: string;
  onContentGenerated?: (content: any) => void;
}

export function AILearningTools({ topic = '', onContentGenerated }: AILearningToolsProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('objectives');
  const [inputTopic, setInputTopic] = useState(topic);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [count, setCount] = useState(5);
  const [timeAvailable, setTimeAvailable] = useState(10);
  const [currentLevel, setCurrentLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [targetLevel, setTargetLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [content, setContent] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Map UI difficulty levels to service difficulty levels
  const mapDifficultyToService = (level: 'beginner' | 'intermediate' | 'advanced'): 'easy' | 'medium' | 'hard' => {
    switch (level) {
      case 'beginner': return 'easy';
      case 'intermediate': return 'medium';
      case 'advanced': return 'hard';
      default: return 'medium';
    }
  };

  const handleGenerate = async () => {
    if (!inputTopic) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      let result;
      switch (activeTab) {
        case 'objectives':
          result = await autogenService.generateLearningObjectives(inputTopic, difficulty, count);
          break;
        case 'study-plan':
          result = await autogenService.generateStudyPlan(inputTopic, String(timeAvailable), currentLevel, targetLevel);
          break;
        case 'practice':
          result = await autogenService.generatePracticeProblems(inputTopic, mapDifficultyToService(difficulty), count, true);
          break;
        case 'flashcards':
          result = await autogenService.generateFlashcards(inputTopic, count);
          break;
        case 'summary':
          result = await autogenService.summarizeContent(content, 500);
          break;
        default:
          throw new Error("Invalid tab selected");
      }

      if (result.success && result.data) {
        setGeneratedContent(result.data);
        onContentGenerated?.(result.data);
        toast.success("Content generated successfully!");
      } else {
        throw new Error(result.error?.message || "Failed to generate content");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!generatedContent) return null;

    switch (activeTab) {
      case 'objectives':
        return (
          <div className="space-y-4">
            {(generatedContent as LearningObjective[]).map((objective, index) => (
              <Card key={objective.id}>
                <CardHeader>
                  <CardTitle>Objective {index + 1}</CardTitle>
                  <CardDescription>Category: {objective.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{objective.description}</p>
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">Difficulty: {objective.difficulty}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'study-plan':
        const plan = generatedContent as StudyPlan;
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Study Plan Overview</CardTitle>
                <CardDescription>
                  From {plan.currentLevel} to {plan.targetLevel} level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Estimated Hours: {plan.estimatedHours}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Modules</h3>
              {plan.modules.map((module, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Estimated Hours: {module.estimatedHours}</p>
                    <div className="mt-2">
                      <h4 className="font-medium">Topics:</h4>
                      <ul className="list-disc list-inside">
                        {module.topics.map((topic, i) => (
                          <li key={i}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Resources</h3>
              {plan.resources.map((resource, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>Type: {resource.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{resource.description}</p>
                    {resource.url && (
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Access Resource
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Milestones</h3>
              {plan.milestones.map((milestone, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{milestone.title}</CardTitle>
                    <CardDescription>{milestone.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Estimated Completion Time: {milestone.estimatedCompletionTime} hours</p>
                    <div className="mt-2">
                      <h4 className="font-medium">Checkpoints:</h4>
                      <ul className="list-disc list-inside">
                        {milestone.checkpoints.map((checkpoint, i) => (
                          <li key={i}>{checkpoint}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'practice':
        return (
          <div className="space-y-4">
            {(generatedContent as PracticeProblem[]).map((problem, index) => (
              <Card key={problem.id}>
                <CardHeader>
                  <CardTitle>{problem.title}</CardTitle>
                  <CardDescription>Difficulty: {problem.difficulty}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{problem.description}</p>
                  {problem.hints && problem.hints.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium">Hints:</h4>
                      <ul className="list-disc list-inside">
                        {problem.hints.map((hint, i) => (
                          <li key={i}>{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {problem.solution && (
                    <div className="mt-4">
                      <h4 className="font-medium">Solution:</h4>
                      <p>{problem.solution}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <div className="text-sm text-muted-foreground">
                    Expected Time: {problem.expectedTime} minutes
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        );

      case 'flashcards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(generatedContent as Flashcard[]).map((card, index) => (
              <Card key={card.id} className="h-[200px] perspective-1000">
                <CardContent className="relative h-full transform-style-3d transition-transform duration-500 hover:rotate-y-180">
                  <div className="absolute w-full h-full backface-hidden">
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">Front</h3>
                      <p>{card.front}</p>
                    </div>
                  </div>
                  <div className="absolute w-full h-full backface-hidden rotate-y-180">
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">Back</h3>
                      <p>{card.back}</p>
                      {card.tags && card.tags.length > 0 && (
                        <div className="mt-2">
                          {card.tags.map((tag, i) => (
                            <span key={i} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'summary':
        const summary = generatedContent as ContentSummary;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Content Summary</CardTitle>
              <CardDescription>Difficulty: {summary.difficulty}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Summary</h3>
                  <p>{summary.summary}</p>
                </div>
                <div>
                  <h3 className="font-medium">Key Points</h3>
                  <ul className="list-disc list-inside">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Estimated Reading Time: {summary.estimatedReadingTime} minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 gap-4">
          <TabsTrigger value="objectives">Learning Objectives</TabsTrigger>
          <TabsTrigger value="study-plan">Study Plan</TabsTrigger>
          <TabsTrigger value="practice">Practice Problems</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="summary">Content Summary</TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                placeholder="Enter a topic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeTab === 'study-plan' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeAvailable">Time Available (hours)</Label>
                <Input
                  id="timeAvailable"
                  type="number"
                  value={timeAvailable}
                  onChange={(e) => setTimeAvailable(Number(e.target.value))}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentLevel">Current Level</Label>
                <Select value={currentLevel} onValueChange={(value: any) => setCurrentLevel(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select current level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetLevel">Target Level</Label>
                <Select value={targetLevel} onValueChange={(value: any) => setTargetLevel(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-2">
              <Label htmlFor="content">Content to Summarize</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content to summarize"
                className="min-h-[200px]"
              />
            </div>
          )}

          {(activeTab === 'objectives' || activeTab === 'practice' || activeTab === 'flashcards') && (
            <div className="space-y-2">
              <Label htmlFor="count">Number of Items</Label>
              <Input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Content"}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
} 