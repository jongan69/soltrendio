declare module 'react-file-viewer' {
  interface FileViewerProps {
    fileType: string;
    filePath: string;
    errorComponent?: React.ComponentType<any>;
    onError?: (error: any) => void;
  }
  
  const FileViewer: React.FC<FileViewerProps>;
  export default FileViewer;
}