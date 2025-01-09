import { handleTweetThis } from "@utils/handleTweet";
import ReactMarkdown from "react-markdown";
export const ThesisSection = ({ thesis, onGenerateNew, hasEligibleTokens, handleCreatePortfolio, isCreatingPortfolio, createdPortId }: { thesis: string, onGenerateNew: () => void, hasEligibleTokens: boolean, handleCreatePortfolio: () => void, isCreatingPortfolio: boolean, createdPortId: string | null }) => (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Investment Thesis
        </h2>
        <div className="flex flex-row gap-2 w-full sm:w-auto">
          <button
            className="btn btn-sm sm:btn-md bg-gradient-to-r from-purple-500 to-pink-500 border-none text-white hover:from-purple-600 hover:to-pink-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={onGenerateNew}
          >
            Generate New
          </button>
          <button
            className="btn btn-sm sm:btn-md bg-gradient-to-r from-blue-500 to-purple-500 border-none text-white hover:from-blue-600 hover:to-purple-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={() => handleTweetThis(thesis)}
          >
            Tweet
          </button>
          {createdPortId ? (
            <a
              href={`https://port.fun/${createdPortId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm sm:btn-md bg-gradient-to-r from-purple-500 to-blue-500 border-none text-white hover:from-purple-600 hover:to-blue-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
            >
              View Port
            </a>
          ) : (
            <button
              className="btn btn-sm sm:btn-md bg-gradient-to-r from-green-500 to-blue-500 border-none text-white hover:from-green-600 hover:to-blue-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-blue-500"
              onClick={handleCreatePortfolio}
              disabled={!hasEligibleTokens || isCreatingPortfolio}
              title={!hasEligibleTokens ? "No eligible tokens found. Only tokens ending with 'pump' can be added." : ""}
            >
              {isCreatingPortfolio ? "Creating..." : "Create Portfolio"}
            </button>
          )}
        </div>
      </div>
      <div className="prose prose-sm sm:prose max-w-none break-words overflow-x-hidden whitespace-pre-line text-gray-900 text-sm sm:text-base">
        <ReactMarkdown>{thesis}</ReactMarkdown>
      </div>
    </div>
  );