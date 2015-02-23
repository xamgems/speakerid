# speakerid
A voice identification and recognition system.

## API
/get_sspeakers() -> [(name, id), ...]
/predict(wav) -> [(id, vote_count),, ...]
/new_speaker(name) -> id
/learn_speaker(wav, id) ->
