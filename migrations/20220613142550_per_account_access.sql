create table vieweraccess (
                       id integer,
                       viewer integer,
                       PRIMARY KEY (id, viewer),
                       FOREIGN KEY (id) REFERENCES users(id),
                       FOREIGN KEY (viewer) REFERENCES users(id)
);