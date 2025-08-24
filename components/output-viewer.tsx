"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Check, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface OutputViewerProps {
  content: string | null
  isLoading: boolean
  repoUrl?: string
}

export function OutputViewer({ content, isLoading, repoUrl }: OutputViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    if (content) {
      const blob = new Blob([content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const repoName = repoUrl ? repoUrl.split("/").pop() : "repository"
      a.href = url
      a.download = `${repoName}-context-index.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto animate-fade-in">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 flex-1" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (!content) {
    return null
  }

  return (
    <Card className="w-full max-w-4xl mx-auto animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-xl">Generated Context Index</CardTitle>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="transition-all"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="transition-all"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-slate max-w-none">
          <div className="bg-gray-50 rounded-lg p-6 overflow-auto max-h-[600px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-800">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium mb-2 mt-4 text-gray-700">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-gray-600 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-600">{children}</li>
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "")
                  return match ? (
                    <pre className="bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto mb-4">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  )
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600">
                    {children}
                  </blockquote>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}