

INSERT INTO media (kind, name, title, body, bg_color, duration_seconds) VALUES
 ('text','Aviso de boas-vindas','Bem-vindo!','Este é um aviso de exemplo.
Crie os seus na Biblioteca de mídias.','#14634A',10),
 ('text','Horário de exemplo','Atendimento','Segunda a sexta
Das 8h às 22h','#1C1B16',8);

INSERT INTO playlists (name) VALUES ('Mural Inicial');

INSERT INTO playlist_items (playlist_id, media_id, position) VALUES (1, 1, 0), (1, 2, 1);

INSERT INTO devices (name, location, orientation, notes, token) VALUES
 ('TV da Biblioteca','Biblioteca','horizontal','TV de 43 polegadas na entrada.',
  lower(hex(randomblob(24))));