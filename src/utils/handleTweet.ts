export const handleTweetThis = (thesis: string) => {
    const tweetText = encodeURIComponent(`Investment Thesis Generated using https://soltrendio.com:\n\n${thesis}`);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, "_blank");
  };