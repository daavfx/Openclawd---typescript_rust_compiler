export 
export async function loadAgents(state) {
  if ((!state.client || !state.connected)) {
    return;
  }
  if (state.agentsLoading) {
    return;
  }
  state.agentsLoading = true;
  state.agentsError = null;
  try {
    {
      const res = await state.client.request("agents.list", {  });
      if (res) {
        state.agentsList = res;
      }
    }
  }
  catch (err) {
    {
      state.agentsError = String(err);
    }
  }
  finally {
    {
      state.agentsLoading = false;
    }
  }
}

