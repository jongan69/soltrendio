import { Circles } from "react-loader-spinner";

export const LoadingState = ({ message, isWaitingConfirmation }: { 
  message: string;
  isWaitingConfirmation: boolean;
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <p className="text-lg mb-4">
      {isWaitingConfirmation
        ? "Waiting for transaction confirmation..."
        : message}
    </p>
    <Circles color="#00BFFF" height={80} width={80} />
  </div>
); 