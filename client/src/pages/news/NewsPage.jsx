import React, { useEffect, useState } from "react";
import { Container } from "@mui/system";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageHeadline from "../../components/headline/PageHeadline";
import { getNews } from "../../services/serverCalls";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function NewsPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getNews().then((data) => data && setPosts(data));
  }, []);

  return (
    <Container>
      <PageHeadline title="News" />
      {posts.length > 0 ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {posts.map((post) => (
            <Card variant="outlined" key={post.id}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {post.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(post.createdAt)}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {post.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No news yet.
        </Typography>
      )}
    </Container>
  );
}

export default NewsPage;
