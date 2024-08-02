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

const GoogleTrendsProjection = ({ trendsData, dataNames }: any) => {
  const data = {
    labels: trendsData?.map((data: { formattedTime: any; }) => data.formattedTime),
    datasets: [
      {
        label: dataNames[0],
        data: trendsData?.map((data: { value: any[]; }) => data.value[0]),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
      },
      {
        label: dataNames[1],
        data: trendsData?.map((data: { value: any[]; }) => data.value[1]),
        fill: false,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
      },
      {
        label: dataNames[2],
        data: trendsData?.map((data: { value: any[]; }) => data.value[2]),
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
      },
    ],
  };

  return (
    <div>
      <h2>Google Trends Projection</h2>
      <Line data={data} />
    </div>
  );
};

export default GoogleTrendsProjection;
