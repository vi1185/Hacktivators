import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Wand2, FileText, Image, Code, Brain, Sparkles, Loader2, Save, Upload } from 'lucide-react';
import { useCourseContext } from '@/context/CourseContext';
import autogenService from '@/services/autogen-service';
import { cn } from '@/lib/utils';

interface AIContentCreatorProps {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  onContentCreated?: (content: any) => void;
}

const AIContentCreator: React.FC<AIContentCreatorProps> = ({
  courseId,
  moduleId,
  lessonId,
  onContentCreated
}) => {
  const { currentCourse, currentModule, currentLesson } = useCourseContext();
  
  const [contentType, setContentType] = useState<'text' | 'image' | 'code' | 'diagram'>('text');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCustomFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setCustomFilePreview(null);
      }
    }
  };
  
  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let response;
      
      switch (contentType) {
        case 'text':
          response = await autogenService.generateCustomContent(prompt, 'text', {
            courseId,
            moduleId,
            lessonId,
            context: currentLesson?.content || currentModule?.description || currentCourse?.description
          });
          break;
        case 'image':
          response = await autogenService.generateCustomContent(prompt, 'image', {
            courseId,
            moduleId,
            lessonId
          });
          break;
        case 'code':
          response = await autogenService.generateCustomContent(prompt, 'code', {
            courseId,
            moduleId,
            lessonId,
            language: 'javascript' // Default language
          });
          break;
        case 'diagram':
          response = await autogenService.generateCustomContent(prompt, 'diagram', {
            courseId,
            moduleId,
            lessonId
          });
          break;
        default:
          throw new Error('Unsupported content type');
      }
      
      if (response.success && response.data) {
        setGeneratedContent(response.data);
        toast.success('Content generated successfully!');
      } else {
        throw new Error(response.error?.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveContent = () => {
    if (generatedContent && onContentCreated) {
      onContentCreated(generatedContent);
      toast.success('Content saved to your course!');
    }
  };
  
  const handleAnalyzeFile = async () => {
    if (!customFile) {
      toast.error('Please upload a file first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await autogenService.analyzeFile(customFile, {
        courseId,
        moduleId,
        lessonId,
        context: currentLesson?.content || currentModule?.description || currentCourse?.description
      });
      
      if (response.success && response.data) {
        setGeneratedContent(response.data);
        toast.success('File analyzed successfully!');
      } else {
        throw new Error(response.error?.message || 'Failed to analyze file');
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error('Failed to analyze file. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          AI Content Creator
        </CardTitle>
        <CardDescription>
          Generate custom content for your course using AI
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Content</TabsTrigger>
            <TabsTrigger value="analyze">Analyze File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Text Content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span>Image</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="code">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span>Code</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="diagram">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span>Diagram</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                placeholder="Describe what you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <Button 
              onClick={handleGenerateContent} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload File</label>
              <div className="border-2 border-dashed rounded-md p-4 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md,.js,.py,.java,.cpp,.cs"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {customFile ? customFile.name : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Supports images, documents, and code files
                  </span>
                </label>
              </div>
              
              {customFilePreview && (
                <div className="mt-4">
                  <img 
                    src={customFilePreview} 
                    alt="Preview" 
                    className="max-h-48 rounded-md mx-auto"
                  />
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleAnalyzeFile} 
              disabled={isGenerating || !customFile}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Analyze File
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
        
        {generatedContent && (
          <div className="mt-6 space-y-4">
            <Separator />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Generated Content</h3>
              
              {contentType === 'text' && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {generatedContent.text}
                </div>
              )}
              
              {contentType === 'image' && (
                <div className="flex justify-center">
                  <img 
                    src={generatedContent.imageUrl} 
                    alt="Generated" 
                    className="max-h-64 rounded-md"
                  />
                </div>
              )}
              
              {contentType === 'code' && (
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  <code>{generatedContent.code}</code>
                </pre>
              )}
              
              {contentType === 'diagram' && (
                <div className="bg-muted p-4 rounded-md">
                  {/* Render diagram based on type */}
                  {generatedContent.type === 'mermaid' && (
                    <div className="mermaid">{generatedContent.code}</div>
                  )}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2">
                {generatedContent.tags?.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleSaveContent} 
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              Save to Course
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIContentCreator; 