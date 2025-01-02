import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

interface TrendsDataPoint {
  formattedTime: string;
  value: number[];
}

interface GoogleTrendsProjectionProps {
  trendsData: TrendsDataPoint[];
  dataNames: string[];
}

const GoogleTrendsProjection = ({ trendsData, dataNames }: GoogleTrendsProjectionProps) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
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
      }
    }
  };

  const colors = [
    {
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
    },
    {
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
    },
    {
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
    },
  ];

  const data = {
    labels: trendsData?.map((data: { formattedTime: any; }) => data.formattedTime),
    datasets: dataNames.map((name: string, index: number) => ({
      label: name,
      data: trendsData?.map((data: { value: any[]; }) => data.value[index]),
      fill: false,
      backgroundColor: colors[index].backgroundColor,
      borderColor: colors[index].borderColor,
    })),
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-center">Google Trends Projections of Coin Keywords</h2>
      <div className="h-[300px] w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default GoogleTrendsProjection;
