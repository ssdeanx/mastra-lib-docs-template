"use client"

import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowStep {
  id: string
  name: string
  status: "pending" | "active" | "completed"
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Workflow Progress</h3>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center space-x-3 transition-all duration-300",
                step.status === "active" && "scale-105"
              )}
            >
              <div className="flex-shrink-0">
                {step.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 animate-fade-in" />
                ) : step.status === "active" ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm",
                    step.status === "completed" && "text-green-700 font-medium",
                    step.status === "active" && "text-blue-700 font-medium",
                    step.status === "pending" && "text-gray-500"
                  )}
                >
                  {step.name}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[22px] top-8 w-0.5 h-6",
                    step.status === "completed" ? "bg-green-600" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}