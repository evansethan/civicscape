import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, ExternalLink, FileText, Image, File, X } from 'lucide-react';

interface FileViewerProps {
  files: string[];
  title?: string;
  className?: string;
}

interface FileInfo {
  url: string;
  name: string;
  type: string;
  extension: string;
}

function getFileInfo(url: string): FileInfo {
  const filename = url.split('/').pop() || 'unknown-file';
  const extension = filename.toLowerCase().split('.').pop() || '';
  const name = filename;
  
  let type = 'other';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    type = 'image';
  } else if (['pdf'].includes(extension)) {
    type = 'pdf';
  } else if (['txt', 'md', 'csv'].includes(extension)) {
    type = 'text';
  } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    type = 'document';
  }
  
  return { url, name, type, extension };
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return <Image className="h-4 w-4 text-green-600" />;
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-600" />;
    case 'text':
      return <FileText className="h-4 w-4 text-blue-600" />;
    case 'document':
      return <FileText className="h-4 w-4 text-orange-600" />;
    default:
      return <File className="h-4 w-4 text-gray-600" />;
  }
}

function getFileTypeColor(type: string) {
  switch (type) {
    case 'image':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pdf':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'text':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'document':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function EmbeddedFileViewer({ file }: { file: FileInfo }) {
  const [imageError, setImageError] = useState(false);
  
  if (file.type === 'image' && !imageError) {
    return (
      <div className="rounded-lg overflow-hidden border bg-white">
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon(file.type)}
            <span className="font-medium text-sm">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getFileTypeColor(file.type)}>
              {file.extension.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const a = document.createElement('a');
              a.href = file.url;
              a.download = file.name;
              a.click();
            }}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <img 
            src={file.url} 
            alt={file.name}
            className="max-w-full h-auto rounded border"
            style={{ maxHeight: '400px' }}
            onError={() => setImageError(true)}
          />
        </div>
      </div>
    );
  }
  
  if (file.type === 'pdf') {
    return (
      <div className="rounded-lg overflow-hidden border bg-white">
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon(file.type)}
            <span className="font-medium text-sm">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getFileTypeColor(file.type)}>
              PDF
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const a = document.createElement('a');
              a.href = file.url;
              a.download = file.name;
              a.click();
            }}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <iframe 
            src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full border rounded"
            style={{ height: '500px' }}
            title={file.name}
          />
        </div>
      </div>
    );
  }
  
  // For text files, try to display content
  if (file.type === 'text') {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const loadTextContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(file.url);
        const text = await response.text();
        setTextContent(text);
      } catch (error) {
        console.error('Failed to load text content:', error);
        setTextContent('Failed to load file content');
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div className="rounded-lg overflow-hidden border bg-white">
        <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon(file.type)}
            <span className="font-medium text-sm">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getFileTypeColor(file.type)}>
              {file.extension.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const a = document.createElement('a');
              a.href = file.url;
              a.download = file.name;
              a.click();
            }}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          {textContent === null ? (
            <div className="text-center">
              <Button 
                onClick={loadTextContent} 
                disabled={loading}
                variant="outline"
                className="mb-4"
              >
                {loading ? 'Loading...' : 'Preview Text File'}
              </Button>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border max-h-96 overflow-auto">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    );
  }
  
  // For other file types, show download card
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getFileIcon(file.type)}
          <div>
            <div className="font-medium text-sm">{file.name}</div>
            <Badge variant="outline" className={`${getFileTypeColor(file.type)} text-xs`}>
              {file.extension.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(file.url, '_blank')}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name;
            a.click();
          }}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilePreviewModal({ file, isOpen, onClose }: { 
  file: FileInfo | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!file) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(file.type)}
            {file.name}
          </DialogTitle>
        </DialogHeader>
        <EmbeddedFileViewer file={file} />
      </DialogContent>
    </Dialog>
  );
}

export function FileViewer({ files, title = "Assignment Files", className = "" }: FileViewerProps) {
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  
  if (!files || files.length === 0) {
    return null;
  }
  
  const fileInfos = files.map(getFileInfo);
  
  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileInfos.map((file, index) => (
            <div key={index}>
              <EmbeddedFileViewer file={file} />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <FilePreviewModal 
        file={previewFile} 
        isOpen={!!previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </>
  );
}