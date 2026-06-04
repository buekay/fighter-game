import { Router as WouterRouter, Route, Switch } from "wouter";
import Game from "@/pages/Game";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={Game} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
