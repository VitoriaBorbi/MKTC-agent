NR>1{printf "\\n"}
{
  gsub(/\\/, "\\\\")
  gsub(/"/, "\\\"")
  gsub(/\t/, "\\t")
  gsub(/\r/, "")
  printf "%s", $0
}
