/*
  SQL Query Activity — Fin News Dashboard 2026
  DE destino: Tb_FinNews_Dash_2026
  Colunas: Touchpoint (Text 500), SendDate (Date), Analyst (Text 50),
           Sent (Number), Unique_Open (Number), Unique_Click (Number), Bounces (Number)
  Modo: Overwrite
  Frequência: Diário (ex: 06:00 BRT)
*/

SELECT
    j.EmailName                                          AS Touchpoint,
    s.SendDate                                           AS SendDate,
    CASE
        WHEN j.EmailName LIKE '%NWS_EDUARDO%'  THEN 'NWS_EDUARDO'
        WHEN j.EmailName LIKE '%NWS_EVANDRO%'  THEN 'NWS_EVANDRO'
        WHEN j.EmailName LIKE '%NWS_FELIPE%'   THEN 'NWS_FELIPE'
        WHEN j.EmailName LIKE '%NWS_RICARDO%'  THEN 'NWS_RICARDO'
        WHEN j.EmailName LIKE '%NWS_RODRIGO%'  THEN 'NWS_RODRIGO'
        WHEN j.EmailName LIKE '%NWS_THALES%'   THEN 'NWS_THALES'
        ELSE 'OUTRO'
    END                                                  AS Analyst,
    ISNULL(s.Sent,         0)                            AS Sent,
    ISNULL(o.Unique_Open,  0)                            AS Unique_Open,
    ISNULL(c.Unique_Click, 0)                            AS Unique_Click,
    ISNULL(b.Bounces,      0)                            AS Bounces

FROM (
    SELECT JobID,
           CONVERT(date, EventDate) AS SendDate,
           COUNT(*)                 AS Sent
    FROM   _Sent
    WHERE  EventDate >= '2026-01-01'
    GROUP BY JobID, CONVERT(date, EventDate)
) s

INNER JOIN _Job j ON j.JobID = s.JobID

LEFT JOIN (
    SELECT JobID, COUNT(*) AS Unique_Open
    FROM   _Open
    WHERE  IsUnique = 1
    AND    EventDate >= '2026-01-01'
    GROUP BY JobID
) o ON o.JobID = s.JobID

LEFT JOIN (
    SELECT JobID, COUNT(*) AS Unique_Click
    FROM   _Click
    WHERE  IsUnique = 1
    AND    EventDate >= '2026-01-01'
    GROUP BY JobID
) c ON c.JobID = s.JobID

LEFT JOIN (
    SELECT JobID, COUNT(*) AS Bounces
    FROM   _Bounce
    WHERE  EventDate >= '2026-01-01'
    GROUP BY JobID
) b ON b.JobID = s.JobID

WHERE j.EmailName LIKE '%[[]NWS]%'
