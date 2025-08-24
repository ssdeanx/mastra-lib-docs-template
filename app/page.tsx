"use client"

import { useState } from "react"
import { GitHubAnalyzer } from "@/components/github-analyzer"
import { OutputViewer } from "@/components/output-viewer"
import { WorkflowProgress } from "@/components/workflow-progress"

export default function Home() {
  type WorkflowStep = {
    id: string
    name: string
    status: "pending" | "active" | "completed"
  }

  const [isLoading, setIsLoading] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [repoUrl, setRepoUrl] = useState<string>("")
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: "1", name: "Analyzing Documentation", status: "pending" },
    { id: "2", name: "Extracting API Patterns", status: "pending" },
    { id: "3", name: "Identifying Best Practices", status: "pending" },
    { id: "4", name: "Generating Context Index", status: "pending" },
  ])

  const handleAnalyze = async (url: string) => {
    setIsLoading(true)
    setOutput(null)
    setRepoUrl(url)
    
    const updateStep = (stepId: string, status: "pending" | "active" | "completed") => {
      setWorkflowSteps(prev =>
        prev.map(step =>
          step.id === stepId ? { ...step, status } : step
        )
      )
    }

    try {
      updateStep("1", "active")
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep("1", "completed")
      
      updateStep("2", "active")
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep("2", "completed")
      
      updateStep("3", "active")
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep("3", "completed")
      
      updateStep("4", "active")
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate context index")
      }

      const data = await response.json()
      updateStep("4", "completed")
      setOutput(data.markdown)
      
    } catch (error) {
      console.error("Error:", error)
      setWorkflowSteps(prev => 
        prev.map(step => ({ ...step, status: "pending" as const }))
      )
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-4xl font-bold text-white">
            Context Index Generator
          </h1>
          <p className="text-white/80 text-lg">
            Transform GitHub repositories into AI-ready documentation
          </p>
        </div>

        <div className="space-y-8">
          <GitHubAnalyzer onAnalyze={handleAnalyze} isLoading={isLoading} />
          
          {isLoading && (
            <WorkflowProgress steps={workflowSteps} />
          )}
          
          <OutputViewer 
            content={output} 
            isLoading={false} 
            repoUrl={repoUrl}
          />
        </div>
      </div>
    </main>
  )
}