"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Github, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FormData {
  repoUrl: string
}

interface GitHubAnalyzerProps {
  onAnalyze: (repoUrl: string) => Promise<void>
  isLoading: boolean
}

export function GitHubAnalyzer({ onAnalyze, isLoading }: GitHubAnalyzerProps) {
  const [error, setError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await onAnalyze(data.repoUrl)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const validateGitHubUrl = (value: string) => {
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+$/
    if (!githubUrlPattern.test(value)) {
      return "Please enter a valid GitHub repository URL"
    }
    return true
  }

  return (
    <Card className="w-full max-w-2xl mx-auto animate-fade-in">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Github className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold gradient-text">
          GitHub Context Index Generator
        </CardTitle>
        <CardDescription className="text-gray-600">
          Generate AI-powered documentation indexes for any GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                {...register("repoUrl", {
                  required: "Repository URL is required",
                  validate: validateGitHubUrl,
                })}
                type="url"
                placeholder="https://github.com/owner/repository"
                className={cn(
                  "pr-4 pl-10",
                  errors.repoUrl && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={isLoading}
              />
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {errors.repoUrl && (
              <p className="text-sm text-red-500 animate-fade-in">
                {errors.repoUrl.message}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500 animate-fade-in">
                {error}
              </p>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Repository...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Context Index
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Tip:</span> Enter a GitHub repository URL to generate a comprehensive context index including documentation analysis, API patterns, and best practices.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}