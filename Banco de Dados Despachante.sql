-- 1. TABELA: despachantes (Não depende de ninguém, precisa ser a primeira)
CREATE TABLE IF NOT EXISTS public.despachantes
(
    id SERIAL PRIMARY KEY,
    nome character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    telefone character varying(20) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    token_confirmacao character varying(100),
    confirmado boolean DEFAULT false,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT despachantes_email_key UNIQUE (email)
);

-- 2. TABELA: clientes (Depende de despachantes)
CREATE TABLE IF NOT EXISTS public.clientes
(
    id SERIAL PRIMARY KEY,
    despachante_id integer,
    nome character varying(100) NOT NULL,
    cpf character varying(20) NOT NULL,
    telefone character varying(20),
    email character varying(100),
    cep character varying(20),
    endereco character varying(255),
    cidade character varying(100),
    estado character varying(2),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_cpf_key UNIQUE (cpf),
    CONSTRAINT clientes_despachante_id_fkey FOREIGN KEY (despachante_id)
        REFERENCES public.despachantes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- 3. TABELA: veiculos (Depende de clientes)
CREATE TABLE IF NOT EXISTS public.veiculos
(
    id SERIAL PRIMARY KEY,
    cliente_id integer,
    placa character varying(20) NOT NULL,
    renavam character varying(50),
    chassi character varying(50),
    marca character varying(50),
    modelo character varying(50),
    ano_fabricacao character varying(10),
    ano_modelo character varying(10),
    combustivel character varying(50),
    categoria character varying(50),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT veiculos_placa_key UNIQUE (placa),
    CONSTRAINT veiculos_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES public.clientes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- 4. TABELA: processos (Depende de despachantes, clientes e veiculos)
CREATE TABLE IF NOT EXISTS public.processos
(
    id SERIAL PRIMARY KEY,
    despachante_id integer,
    cliente_id integer,
    veiculo_id integer,
    tipo character varying(100),
    status character varying(50) DEFAULT 'Aberto',
    data_abertura date,
    data_vencimento date,
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT processos_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES public.clientes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT processos_despachante_id_fkey FOREIGN KEY (despachante_id)
        REFERENCES public.despachantes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT processos_veiculo_id_fkey FOREIGN KEY (veiculo_id)
        REFERENCES public.veiculos (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- 5. TABELA: vistorias (Depende de despachantes, clientes e veiculos)
CREATE TABLE IF NOT EXISTS public.vistorias
(
    id SERIAL PRIMARY KEY,
    despachante_id integer,
    cliente_id integer,
    veiculo_id integer,
    data_hora timestamp without time zone NOT NULL,
    local_vistoria character varying(255),
    status character varying(50) DEFAULT 'Pendente',
    observacoes text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vistorias_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES public.clientes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT vistorias_despachante_id_fkey FOREIGN KEY (despachante_id)
        REFERENCES public.despachantes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT vistorias_veiculo_id_fkey FOREIGN KEY (veiculo_id)
        REFERENCES public.veiculos (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- 6. TABELA: portal_solicitacoes (Depende de clientes, despachantes, processos e veiculos)
CREATE TABLE IF NOT EXISTS public.portal_solicitacoes
(
    id SERIAL PRIMARY KEY,
    despachante_id integer,
    cliente_id integer,
    veiculo_id integer,
    processo_id integer,
    token character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pendente',
    nome_cliente character varying(100),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT portal_solicitacoes_token_key UNIQUE (token),
    CONSTRAINT portal_solicitacoes_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES public.clientes (id)
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT portal_solicitacoes_despachante_id_fkey FOREIGN KEY (despachante_id)
        REFERENCES public.despachantes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT portal_solicitacoes_processo_id_fkey FOREIGN KEY (processo_id)
        REFERENCES public.processos (id)
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT portal_solicitacoes_veiculo_id_fkey FOREIGN KEY (veiculo_id)
        REFERENCES public.veiculos (id)
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

-- 7. TABELA: portal_documentos (Depende de portal_solicitacoes, fechando a árvore)
CREATE TABLE IF NOT EXISTS public.portal_documentos
(
    id SERIAL PRIMARY KEY,
    solicitacao_id integer,
    tipo_documento character varying(50),
    nome_arquivo character varying(255),
    caminho character varying(255),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT portal_documentos_solicitacao_id_fkey FOREIGN KEY (solicitacao_id)
        REFERENCES public.portal_solicitacoes (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);