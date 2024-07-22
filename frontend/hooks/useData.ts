"use client";

import { useEffect, useState } from "react";

export const useData = <T>(path: string, defaultValue: T) => {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    const response = await fetch(`data/${path}`);

    setLoading(false);
    setData(await response.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading };
};
