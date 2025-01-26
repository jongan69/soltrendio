import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

const SentimentCharts = ({ racismScore, hateSpeechScore, drugUseScore, crudityScore, profanityScore }: any) => {
  // console.log('Chart Scores:', {
  //   racism: racismScore,
  //   hateSpeech: hateSpeechScore,
  //   drugUse: drugUseScore,
  //   crudity: crudityScore,
  //   profanity: profanityScore
  // });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          font: {
            size: 10
          },
          callback: function(tickValue: number | string) {
            return `${(Number(tickValue) * 100).toFixed(0)}%`;
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 10
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Score: ${(context.raw * 100).toFixed(0)}%`
        }
      }
    }
  };

  const data = {
    labels: ['Racism', 'Hate Speech', 'Drug Use', 'Crudity', 'Profanity'],
    datasets: [
      {
        label: 'Sentiment Score',
        data: [racismScore, hateSpeechScore, drugUseScore, crudityScore, profanityScore],
        backgroundColor: [
          'rgba(255, 99, 255, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 255, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="h-[300px] w-full">
      <Bar data={data} options={options} />
    </div>
  );
};

export default SentimentCharts;
